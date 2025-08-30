        window.onload = function () {
            // Initialize the map, centered on Australia
            const map = L.map('map').setView([-25.2744, 133.7751], 4);

            // Base maps
            const baseMaps = {
                "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map),
                "Satellite": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenTopoMap'
                })
            };

            // Function to create a GeoJSON layer with popups
            function createGeoJsonLayer(url, layerName) {
                const layer = L.geoJSON(null, {
                    // This function is called for each feature and is used to bind popups
                    onEachFeature: (feature, l) => {
                        // Customize the popup content based on the GeoJSON properties
                        // The 'name' property is a good default, but you can add others
                        let popupContent = `<b>Name:</b> ${feature.properties.name || 'N/A'}`;
                        if (feature.properties.capacitykv) {
                            popupContent += `<br><b>capacitykv:</b> ${feature.properties.capacitykv} kV`;
                        }
                        l.bindPopup(popupContent);
                    },
                    // Style the lines based on capacitykv for better visibility
                    style: (feature) => {
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
                "Electricity Transmission Lines": createGeoJsonLayer('/data/Electricity_Transmission_Lines.geojson', 'Electricity Transmission Lines')
            };

            // Layer controls to toggle layers
            L.control.layers(baseMaps, overlayMaps).addTo(map);
        };