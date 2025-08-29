import pandas as pd
import numpy as np
from geopy.distance import geodesic
import re

# Load datasets
df_power = pd.read_csv('Major_Power_Stations.csv')
df_sub = pd.read_csv('Transmission_Substations.csv')

### Preprocess Major Power Stations ###

# Define base generation types and their proxy capacities
GENERATION_TYPES = {
    'coal': {'capacity': 1000, 'renewable': False},
    'gas': {'capacity': 300, 'renewable': False},
    'hydro': {'capacity': 500, 'renewable': True},
    'solar': {'capacity': 100, 'renewable': True},
    'wind': {'capacity': 200, 'renewable': True},
    'biomass': {'capacity': 20, 'renewable': True},
    'diesel': {'capacity': 30, 'renewable': False},
    'landfill gas': {'capacity': 20, 'renewable': True},
}

def normalize_generation_type(raw_type):
    # Lowercase and strip whitespace
    raw_type = str(raw_type).lower().strip()
    
    # Remove everything after a slash or bracket (common comment format)
    raw_type = re.split(r'[/\(\[]', raw_type)[0].strip()
    
    # Handle known variants and mappings
    if 'hydro' in raw_type:
        return 'hydro'
    elif 'wind' in raw_type:
        return 'wind'
    elif 'coal' in raw_type:
        return 'coal'
    elif 'gas' in raw_type and 'landfill' not in raw_type:
        return 'gas'
    elif 'landfill' in raw_type:
        return 'landfill gas'
    elif 'biomass' in raw_type:
        return 'biomass'
    elif 'solar' in raw_type:
        return 'solar'
    elif 'diesel' in raw_type:
        return 'diesel'
    else:
        return 'unknown'

def assign_capacity_and_renewable(row):
    clean_type = normalize_generation_type(row['generationtype'])
    metadata = GENERATION_TYPES.get(clean_type, {'capacity': 100, 'renewable': False})  # fallback
    return pd.Series({
        'clean_generation_type': clean_type,
        'estimated_capacity': metadata['capacity'],
        'w_green': 1.2 if metadata['renewable'] else 1.0
    })


# Apply cleaning and scoring
df_power[['clean_generation_type', 'estimated_capacity', 'w_green']] = df_power.apply(assign_capacity_and_renewable, axis=1)

### Preprocess Transmission Substations ###

def fill_missing_voltage(df, default_voltage=110):
    
    voltage_col = 'voltagekv'
    
    # Convert voltage to numeric, coercing errors (non-numeric become NaN)
    df[voltage_col] = pd.to_numeric(df[voltage_col], errors='coerce')
    
    # Fill missing (NaN) values with default_voltage
    df[voltage_col].fillna(default_voltage, inplace=True)
    
    return df

df_sub = fill_missing_voltage(df_sub)


### Scoring functions ###

def station_score(lat, lon, df_power, max_distance_km=300, penalty=1000):
    scores = []

    for _, row in df_power.iterrows():
        station_coords = (row['Y'], row['X'])
        candidate_coords = (lat, lon)

        distance_km = geodesic(candidate_coords, station_coords).km

        if distance_km <= max_distance_km:
            score = (row['estimated_capacity'] * row['w_green']) / (1 + distance_km)
            scores.append(score)
    
    if len(scores) == 0:
        scores = [penalty]

    return sum(scores)


def score_substations(lat, lon, df_substations, max_distance_km=100, max_substations=5, penalty=100):
    candidate_coords = (lat, lon)

    # Calculate distance to each substation
    df_substations['distance_km'] = df_substations.apply(
        lambda row: geodesic(candidate_coords, (row['Y'], row['X'])).km, axis=1)

    # Filter substations within max distance
    df_nearby = df_substations[df_substations['distance_km'] <= max_distance_km]

    if df_nearby.empty:
        return penalty  # No substations nearby

    # Calculate score
    df_nearby = df_nearby.copy()
    df_nearby['score'] = (df_nearby['voltagekv']) / (1 + df_nearby['distance_km'])

    # Sum top N scores
    top_scores = df_nearby.sort_values('score', ascending=False).head(max_substations)['score']

    return top_scores.sum()



def score_lines(lat, lon, df_lines, town_coords, max_distance_km=100, penalty=100):
    """
    Score candidate location based on proximity to transmission lines.
    
    Args:
        lat, lon: candidate location coordinates
        df_lines: DataFrame with columns ['name', 'capacitykv', 'length_m']
        town_coords: dict {town_name: (lat, lon)}
        max_distance_km: max distance to consider lines relevant
        penalty: score if no nearby lines
    
    Returns:
        float: score_lines value
    """
    candidate_point = Point(lon, lat)  # Note: shapely uses (x, y) = (lon, lat)
    scores = []
    
    for _, row in df_lines.iterrows():
        # Extract town names from line name, e.g. "Taree to Stroud"
        towns = [t.strip() for t in row['name'].split('to')]
        if len(towns) != 2:
            continue  # Skip if parsing failed
        
        town1, town2 = towns[0], towns[1]
        
        # Get town coordinates (lat, lon)
        if town1 not in town_coords or town2 not in town_coords:
            continue  # Skip if coords missing
        
        coord1 = town_coords[town1]
        coord2 = town_coords[town2]
        
        # Create LineString for the transmission line segment
        line = LineString([(coord1[1], coord1[0]), (coord2[1], coord2[0])])  # (lon, lat)
        
        # Calculate distance from candidate point to the line in degrees (approx)
        # Then convert to km using geodesic for more accuracy
        
        # Shapely distance is Euclidean on degrees — approximate for small distances
        # Better to find the closest point on the line and then geodesic distance
        
        nearest_point = line.interpolate(line.project(candidate_point))
        nearest_coords = (nearest_point.y, nearest_point.x)  # (lat, lon)
        
        distance_km = geodesic((lat, lon), nearest_coords).km
        
        if distance_km > max_distance_km:
            continue
        
        capacity = row.get('capacitykv', 0)
        if pd.isna(capacity):
            capacity = 0
        
        # Compute score component
        score = capacity / (distance_km + 1)
        scores.append(score)
    
    if not scores:
        return penalty
    
    return sum(scores)





# Example: Evaluate a candidate site in Wagga Wagga
candidate_lat = -35.1175
candidate_lon = 147.3707

energy_score = station_score(candidate_lat, candidate_lon, df_power)
print(f"Power Score for Wagga Wagga: {energy_score:.2f}")

sub_score = score_substations(candidate_lat, candidate_lon, df_sub)
print(f"Sub Score for Wagga Wagga: {sub_score:.2f}")