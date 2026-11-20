# AetherHound Hardware Calibration & Gain Staging Guide

This engineering handbook defines standard operating procedures (SOP) for calibrating acoustic microphones and Software Defined Radio (SDR) hardware in air-gapped server room deployments.

---

## 1. RTL-SDR Gain Staging & Dynamic Range

### 1.1 Front-End Saturation Prevention
RTL-SDR dongles (RTL2832U + R820T2) feature an 8-bit ADC providing an effective dynamic range of approximately 48–50 dB. To avoid intermodulation distortion and harmonic ghosting:
1. **Disable Automatic Gain Control (AGC):** Hardware AGC causes threshold flutter during burst transmissions. Always lock gain manually:
   ```python
   sdr.gain = 29.7  # dB (Optimal for indoor RF side-channel surveillance)
   ```
2. **LNA Gain Optimization:** Set tuner gain between 25.4 dB and 32.8 dB. Gains above 40 dB saturate the low-noise amplifier when operating near high-density server power supplies.
3. **Zero-IF DC Spike Removal:** The central zero-Hertz DC carrier spike is eliminated in software by setting the center frequency with an offset ($\Delta f = +250$ kHz) or applying notch rejection at bin 0.

### 1.2 Thermal Drift & PPM Correction
Standard RTL-SDR v3 oscillators drift up to $\pm 20$ PPM during warm-up:
* Allow **5 minutes warm-up time** before initiating automated SIGINT detection.
* Measure frequency offset against known GSM (935–960 MHz) or broadcast FM carriers.
* Configure PPM correction factor in `aetherhound/config.py`:
  ```python
  sdr_freq_correction_ppm: int = 1  # Measured hardware offset
  ```

---

## 2. Acoustic Sensor Array Sensitivity Calibration

### 2.1 Noise Floor Baseline Staging
1. Position microphone array at rack boundary (0.5m to 2.0m from target chassis).
2. Sample unmodulated ambient server room acoustic noise:
   * **Target Baseline:** -50 dBFS to -42 dBFS.
   * If noise floor exceeds -35 dBFS, apply acoustic foam dampening or adjust analog preamp gain downward.
3. **Headroom Clamping:** Set digital headroom clamp to **-3 dBFS** to guarantee that sudden fan acceleration bursts do not clip the ADC.

### 2.2 Blade Pass Frequency (BPF) Harmonic Isolation
Server cooling fans typically operate at 3,000–6,000 RPM with 5 or 7 blades:
$$\text{BPF} = \frac{\text{RPM}}{60} \times N_{\text{blades}} \approx 250 \text{ Hz} \text{ to } 700 \text{ Hz}$$
AetherHound applies a 4th-order Butterworth bandpass filter configured to isolate covert modulation sidebands between 1,200 Hz and 2,400 Hz, rejecting low-frequency building HVAC rumble (< 200 Hz).

---

## 3. Sensor Deployment Verification Checklist

Run diagnostic self-test before arming real-time monitoring:
```bash
# Verify RTL-SDR and audio device enumeration
python run_demo.py --check-hardware

# Run automated sensor unit test suite
pytest tests/test_sensors.py -v
```

| Check Item | Acceptance Standard | Fallback Action |
| :--- | :--- | :--- |
| RTL-SDR Device Claim | Device identified via USB VID/PID | Rebind WinUSB driver via Zadig |
| Audio Ingestion Latency | Buffer callback latency $< 15$ ms | Increase chunk size to 2048 |
| RF Noise Floor | PSD median $< -75$ dBFS | Relocate antenna away from power rails |
| Acoustic Dynamic Range | SNR $> 15$ dB on test tone | Adjust microphone analog potentiometer |
