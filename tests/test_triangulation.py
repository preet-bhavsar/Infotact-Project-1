"""
Unit Tests for Server Rack Spatial Triangulation and Localization.
"""

import pytest
from aetherhound.engine.triangulator import RackTriangulator

def test_rack_pinpointing_geometry():
    triangulator = RackTriangulator()
    # Simulate high RSSI on sensor close to Rack-Alpha (1.0, 2.0)
    # Sensor-West is at (0.5, 3.5), Sensor-South is at (4.0, 0.5)
    rssi_map = {
        "Sensor-West": 75.0,   # Strongest near west
        "Sensor-South": 70.0,
        "Sensor-North": 50.0,
        "Sensor-East": 45.0
    }
    rack, confidence, coords = triangulator.pinpoint_infected_rack(rssi_map)
    assert rack in triangulator.racks
    assert 0.0 <= confidence <= 1.0
    assert len(coords) == 2

def test_wall_attenuation_correction():
    triangulator = RackTriangulator()
    raw_dist = 5.0
    adjusted_dist = triangulator.apply_wall_attenuation(raw_dist, wall_count=2, attenuation_per_wall_db=3.0)
    assert adjusted_dist < raw_dist
    assert adjusted_dist > 0.0
