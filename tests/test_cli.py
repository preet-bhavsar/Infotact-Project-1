"""
Unit Tests for AetherHound Tactical Terminal Interface.
"""

import pytest
from aetherhound.cli.hacker_terminal import HackerTerminalUI

def test_hacker_terminal_grid():
    ui = HackerTerminalUI()
    grid = ui.render_rack_grid("Rack-Delta")
    assert "*Rack-Delta*" in grid
    assert "Rack-Alpha" in grid
    assert "Rack-Zeta" in grid
