window.onload = function() {

    var map = L.map('map').setView([ -25.2744, 133.7751 ], 4); // Centered on Australia

    // Base maps
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    var satellite = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap'
    });

    // Government dataset - GeoJSON example (replace URL with real API endpoint)
    var govtData = L.geoJSON(null, {
        onEachFeature: function (feature, layer) {
        layer.bindPopup("<b>Name:</b> " + feature.properties.name);
        }
    }).addTo(map);

    fetch('/Major_Power_Stations.geojson')
        .then(response => response.json())
        .then(data => govtData.addData(data));

    // Optional: WMS Layer (if government provides WMS endpoint)
    var wmsLayer = L.tileLayer.wms('https://example.gov.au/geoserver/wms', {
        layers: 'dataset:layer_name',
        format: 'image/png',
        transparent: true,
        attribution: "Gov Data"
    });

    // Layer controls
    var baseMaps = {
        "OpenStreetMap": osm,
        "Satellite": satellite
    };

    var overlayMaps = {
        "Major Power Station Data": govtData,
        "WMS Layer": wmsLayer
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);
};
