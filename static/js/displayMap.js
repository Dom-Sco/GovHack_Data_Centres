window.onload = function () {
    // Include Turf.js for geospatial analysis, especially for area calculation
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
    document.head.appendChild(script);

    // Initialize the map, centered on Australia
    const map = L.map('map').setView([-25.2744, 133.7751], 4);

    // Base maps
    const openStreetMapDefault = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const openStreetMapGreyscale = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
    });
    
    // Note: Corrected the satellite tile layer URL for a better visual
    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: 'Map data © Google'
    });

    const baseMaps = {
        "OpenStreetMap": openStreetMapDefault,
        "Stamen Toner (Greyscale)": openStreetMapGreyscale,
        "Google Satellite": satelliteLayer
    };

    // Function to create a GeoJSON layer with popups
    function createGeoJsonLayer(url, layerName) {
        const layer = L.geoJSON(null, {
            // Filter to control the visibility of GeoJSON features
            filter: (feature) => {
                // Only apply the filter to the "Water Bodies" layer
                if (layerName === "Water Bodies") {
                    // Check if the feature is a Polygon or MultiPolygon
                    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
                        // Calculate the area using Turf.js and filter based on a threshold (100,000,000 m²)
                        return turf.area(feature) > 100000000;
                    }
                }
                // Return true for all other layers to display them by default
                return true;
            },
            // This function is called for each feature and is used to bind popups
            onEachFeature: (feature, l) => {
                // Customize the popup content based on the GeoJSON properties
                // The 'name' property is a good default, but you can add others
                let popupContent = `<b>Name:</b> ${feature.properties.name || 'N/A'}`;
                if (feature.properties.capacitykv) {
                    popupContent += `<br><b>capacitykv:</b> ${feature.properties.capacitykv} kV`;
                }
                if (feature.properties.region) {
                    popupContent += `<br><b>Region:</b> ${feature.properties.region}`;
                }
                l.bindPopup(popupContent);
            },
            // Style the lines or polygons based on the layer name
            style: (feature) => {
                // Styling for Electricity Transmission Lines
                if (layerName === "Electricity Transmission Lines") {
                    const capacitykv = feature.properties.capacitykv;
                    let color = '#3388ff'; // Default color
                    let weight = 2;

                    if (capacitykv >= 500) {
                        color = '#d73027'; // Red for high capacitykv
                        weight = 4;
                    } else if (capacitykv >= 220) {
                        color = '#fc8d59'; // Orange for medium-high
                        weight = 3;
                    } else if (capacitykv >= 110) {
                        color = '#fee090'; // Yellow for medium
                        weight = 2;
                    }
                    return {
                        color: color,
                        weight: weight,
                        opacity: 0.8
                    };
                } 
                // Styling for the new Water Source Regions
                else if (layerName === "Water Bodies") {
                    return {
                        fillColor: '#2c7fb8', // Blue fill color
                        color: '#045a8d', // Darker blue border
                        weight: 1,
                        opacity: 0.8,
                        fillOpacity: 0.5
                    };
                }
                // Default styling for other layers
                else {
                    return {};
                }
            }
        }).addTo(map);

        // Fetch the GeoJSON data from the specified URL
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => layer.addData(data))
            .catch(err => console.error(`Error loading ${layerName}:`, err));

        return layer;
    }

    // Overlay layers
    const overlayMaps = {
        "Major Power Station Data": createGeoJsonLayer('/data/Major_Power_Stations.geojson', 'Major Power Station Data'),
        "Transmission Substations Data": createGeoJsonLayer('/data/Transmission_Substations.geojson', 'Transmission Substations Data'),
        "Electricity Transmission Lines": createGeoJsonLayer('/data/Electricity_Transmission_Lines.geojson', 'Electricity Transmission Lines'),
        // Added a new layer for Water Source Regions
        "Water Source Regions": createGeoJsonLayer('/data/Australian_Hydrological_Geospatial_Fabric_-_Water_Bodies.geojson', 'Water Bodies')
    };

    // Layer controls to toggle layers
    L.control.layers(baseMaps, overlayMaps).addTo(map);
};