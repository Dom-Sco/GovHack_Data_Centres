import pandas as pd
import numpy as np
from geopy.geocoders import Nominatim
import time

df_lines = pd.read_csv('Electricity_Transmission_Lines.csv')

def extract_unique_towns(df, column='name'):
    towns = []
    for line_name in df[column]:
        # Split on ' to ' (case insensitive, strip spaces)
        parts = line_name.lower().split(' to ')
        if len(parts) == 2:
            town1 = parts[0].strip().title()
            town2 = parts[1].strip().title()
            towns.extend([town1, town2])
    # Get unique towns
    unique_towns = list(set(towns))
    return unique_towns

geolocator = Nominatim(user_agent="towndata")

def get_coordinates(town_name, country="Australia"):
    try:
        location = geolocator.geocode(f"{town_name}, {country}")
        if location:
            return (location.latitude, location.longitude)
        else:
            return None
    except Exception as e:
        print(f"Error geocoding {town_name}: {e}")
        return None



# For multiple towns, you might want to pause between requests to respect usage policy:
towns = extract_unique_towns(df_lines)


town_coords = {}
for town in towns:
    coords = get_coordinates(town)
    if coords:
        town_coords[town] = coords
    time.sleep(10)  # polite pause between requests

print(town_coords)

# Convert dict to DataFrame
df_town_coords = pd.DataFrame({
    'town': list(town_coords.keys()),
    'coords': list(town_coords.values())
})

df_town_coords.to_csv('town_coordinates.csv', index=False)