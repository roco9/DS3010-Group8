import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
import asyncio
import pymongo
from dotenv import load_dotenv
import random
import pickle
import joblib
import sys
import math
from datetime import datetime
from typing import Optional

def convert_to_minutes(x):
  df = x.copy()
  for column in df.columns:

    try:
        numeric_column = pd.to_numeric(df[column], errors='coerce').fillna(0).astype(int)
        
        hh = (numeric_column // 100).astype(int)
        mm = (numeric_column % 100).astype(int)
        df[column] = hh * 60 + mm
    except Exception as e:
        print(f"Error converting column {column} to int for prediction: {e}")
        df[column] = 0
        
  return df

def recursive_patch_model(obj, target_func):
    if hasattr(obj, '__dict__'):
        for attr, value in obj.__dict__.items():
            if value is target_func:
                obj.__dict__[attr] = convert_to_minutes
            elif isinstance(value, (list, tuple)):
                for i, item in enumerate(value):
                    if item is target_func:
                        value[i] = convert_to_minutes
                    else:
                        recursive_patch_model(item, target_func)
            elif isinstance(value, dict):
                for key, item in value.items():
                    if item is target_func:
                        value[key] = convert_to_minutes
                    else:
                        recursive_patch_model(item, target_func)
            else:
                recursive_patch_model(value, target_func)

model_path = 'model.pkl'
MODEL = None
try:
    with open(model_path, 'rb') as f:
        class DummyModule:
            pass
            
        sys.modules['__main__'] = DummyModule()
        setattr(sys.modules['__main__'], 'convert_to_minutes', convert_to_minutes)
        
        random_search_cv = joblib.load(model_path)
        
        MODEL = random_search_cv.best_estimator_ 
        
        print(f"Machine Learning Model (best_estimator) loaded successfully from: {model_path} via patching.")

except FileNotFoundError:
    print(f"ERROR: Model file not found at: {model_path}. Prediction will use dummy data.")
except Exception as e:
    print(f"Error loading model using joblib or extracting estimator: {e}")

if MODEL is not None:    
    if hasattr(MODEL, 'feature_names_in_'):
        print("Features required by the model:")
        required_features = list(MODEL.feature_names_in_)
        print(required_features)
app = FastAPI(title="Flight Data Geo-Mapper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AIRPORT_CODES_PATH = "../../dataset/archive/airport-codes/iata-icao.csv"

if not os.path.exists(AIRPORT_CODES_PATH):
    print(f"ERROR: Airport codes file not found at: {AIRPORT_CODES_PATH}")

try:
    airport_codes_df = pd.read_csv(AIRPORT_CODES_PATH)
    airport_codes_df = airport_codes_df.drop_duplicates(subset="iata", keep="first")
    airport_codes_df["latitude"] = airport_codes_df["latitude"].astype(float)
    airport_codes_df["longitude"] = airport_codes_df["longitude"].astype(float)

    AIRPORT_MAPPING = airport_codes_df.set_index("iata").to_dict('index')
    print("Airport codes loaded successfully into memory.")
except Exception as e:
    print(f"Error loading airport codes CSV: {e}")
    AIRPORT_MAPPING = {}

load_dotenv()
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
database_url = os.getenv("MONGODB_URL")

client = MongoClient(database_url, server_api=ServerApi('1'))
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")

    DB_NAME = "flight_predictions"
    COLLECTION_NAME = "pastQueries"

    db = client[DB_NAME]
    past_queries_collection = db[COLLECTION_NAME]
except Exception as e:
    print(e)

class FlightRequest(BaseModel):
    origin: str
    destination: str
    flightDate: str
    airline: str
    flightNumber: str
    departTime: str
    arrivalTime: str
    taxiOut: Optional[int] = None
    taxiIn: Optional[int] = None
    wheelsOn: str
    wheelsOff: str
    shouldSaveSearch: bool
    distance: float = 0.0
    adjustBasedOnWeather: bool = False

class AirportCoords(BaseModel):
    latitude: float
    longitude: float

class AirportName(BaseModel):
    name: str

class WeatherInfo(BaseModel):
    current_temperature: float
    wind_speed: float

class FlightResponse(BaseModel):
    origin_coords: AirportCoords
    destination_coords: AirportCoords

class FlightResponseWithWeather(BaseModel):
    origin_coords: AirportCoords
    destination_coords: AirportCoords
    origin_weather_code: float
    destination_weather_code: float
    origin_name: str
    destination_name: str
    prediction: float



WEATHER_SEVERITY = {
    0: 0,
    1: 1, 2: 2, 3: 3,
    45: 4, 48: 4,
    51: 5, 53: 6, 55: 7,
    56: 8, 57: 9,
    61: 5, 63: 6, 65: 7,
    66: 8, 67: 9,
    71: 5, 73: 6, 75: 7,
    77: 6,
    80: 6, 81: 7, 82: 8,
    85: 6, 86: 7,
    95: 9,
    96: 10,
    99: 10
}
MAX_SEVERITY = max(WEATHER_SEVERITY.values())

def weather_code_to_rating(code: int) -> float:
    return WEATHER_SEVERITY.get(code, 0) / MAX_SEVERITY

async def fetch_weather(lat: float, lon: float) -> float:
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current_weather=true"
    )
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    response.raise_for_status()
    data = response.json()
    weather_code = data.get("current_weather", {}).get("weathercode", 0)
    rating = weather_code_to_rating(weather_code)
    print(rating)
    return rating

class PastQuery(BaseModel):
    origin: str
    destination: str
    flightDate: str
    airline: str
    flightNumber: str
    departTime: str
    arrivalTime: str
    prediction: float

@app.get("/history")
async def get_history():
    try:
        results = []
        for doc in past_queries_collection.find():
            doc.pop('_id', None) 
            results.append(doc)
            
        return results
        
    except Exception as e:
        print(f"Error fetching history from MongoDB: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Could not retrieve search history."
        )

def to_rad(degrees: float) -> float:
    return degrees * (math.pi / 180)

def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    R = 6371

    lat1_rad = to_rad(lat1)
    lon1_rad = to_rad(lon1)
    lat2_rad = to_rad(lat2)
    lon2_rad = to_rad(lon2)

    dLat = lat2_rad - lat1_rad
    dLon = lon2_rad - lon1_rad

    a = (
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dLon / 2) * math.sin(dLon / 2)
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance_km = R * c

    distance_miles = distance_km * 0.621371
    
    return round(distance_miles, 2)

def make_prediction(flight: FlightRequest, origin_weather: float, destination_weather: float, originCoords: AirportCoords, destinationCoords: AirportCoords) -> float:
    if MODEL is None:
        return random.randint(0, 20)
    date_string = flight.flightDate
    date_format = '%Y-%m-%d'
    date_object = datetime.strptime(date_string, date_format)
    day_of_week_int = date_object.weekday()

    haversine_dist = calculate_haversine_distance(
        originCoords.latitude, 
        originCoords.longitude, 
        destinationCoords.latitude, 
        destinationCoords.longitude
    )

    feature_data = {
        'DayOfWeek': [day_of_week_int],
        'TaxiOut': [flight.taxiOut],
        'TaxiIn': [flight.taxiIn],
        'WheelsOn': [flight.wheelsOn],
        'WheelsOff': [flight.wheelsOff],
        'CRSDepTime': [flight.departTime], 
        'Distance': [haversine_dist],
        'Origin': [flight.origin],
        'Dest': [flight.destination],
        'IATA_Code_Marketing_Airline': [flight.airline]
    }
    
    print(feature_data)
    input_df = pd.DataFrame(feature_data)

    try:
        prediction = MODEL.predict(input_df)[0]
        return float(prediction)
    except Exception as e:
        print(f"Error making prediction with loaded model: {e}")
        return random.randint(0, 20)


@app.post("/get_coords/", response_model=FlightResponseWithWeather)
async def get_flight_coordinates(flight: FlightRequest):
    def get_coords(airport_code: str):
        coords = AIRPORT_MAPPING.get(airport_code.upper())
        if coords is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Airport code '{airport_code}' not found in the dataset."
            )
        
        return AirportCoords(
            latitude=coords["latitude"],
            longitude=coords["longitude"]
        )

    def get_name(airport_code: str):
        coords = AIRPORT_MAPPING.get(airport_code.upper())
        if coords is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Airport code '{airport_code}' not found in the dataset."
            )
        
        return AirportName(
            name=coords["airport"]
        )

    origin_coords = get_coords(flight.origin)
    destination_coords = get_coords(flight.destination)

    origin_name = get_name(flight.origin).name
    print(f"origin: {origin_name}")
    destination_name = get_name(flight.destination).name
    print(f"destination: {destination_name}")

    origin_weather, destination_weather = await asyncio.gather(
        fetch_weather(origin_coords.latitude, origin_coords.longitude),
        fetch_weather(destination_coords.latitude, destination_coords.longitude)
    )

    adjusted_taxi_in = flight.taxiIn
    adjusted_taxi_out = flight.taxiOut
    
    if flight.adjustBasedOnWeather:
        try:
            taxi_out_int = int(flight.taxiOut) if flight.taxiOut else 0
        except (ValueError, TypeError):
            taxi_out_int = 0
            
        try:
            taxi_in_int = int(flight.taxiIn) if flight.taxiIn else 0
        except (ValueError, TypeError):
            taxi_in_int = 0
            
        if taxi_out_int > 0:
            adjusted_taxi_out_val = taxi_out_int + (origin_weather * taxi_out_int)
            adjusted_taxi_out = str(round(adjusted_taxi_out_val))
        
        if taxi_in_int > 0:
            adjusted_taxi_in_val = taxi_in_int + (destination_weather * taxi_in_int)
            adjusted_taxi_in = str(round(adjusted_taxi_in_val))
            
    flight.taxiIn = adjusted_taxi_in
    flight.taxiOut = adjusted_taxi_out

    flight_prediction = make_prediction(flight, origin_weather, destination_weather, originCoords=origin_coords, destinationCoords=destination_coords)
    print(f"Flight prediction: {flight_prediction}")
    if flight.shouldSaveSearch:
        print("should save!")
        query_data = flight.model_dump(exclude={"shouldSaveSearch"})
        query_data["prediction"] = flight_prediction
        
        try:
            result = past_queries_collection.insert_one(query_data)
            print(f"Successfully saved query")
        except Exception as e:
            print(f"Error saving query to MongoDB: {e}")

    return FlightResponseWithWeather(
        origin_coords=origin_coords,
        destination_coords=destination_coords,
        origin_weather_code=origin_weather,
        destination_weather_code=destination_weather,
        origin_name=origin_name,
        destination_name=destination_name,
        prediction=flight_prediction
    )

