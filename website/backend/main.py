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
    shouldSaveSearch: bool

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

    if flight.shouldSaveSearch:
        print("should save!")
        query_data = flight.model_dump(exclude={"shouldSaveSearch"})
        query_data["prediction"] = random.randint(0, 20)
        
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
        prediction=random.randint(0, 20)
    )

