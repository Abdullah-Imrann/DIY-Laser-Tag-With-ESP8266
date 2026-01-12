DIY ESP8266 Laser Tag System 

A low-cost, open-source DIY Laser Tag system built using a single ESP8266 that handles both the gun (shooting) and vest (hit detection) functionality.

This project is designed so anyone can build, understand, and modify a laser tag system at home without unnecessary complexity or expensive components.

Key Features

- Single ESP8266 controls both gun and vest
- IR-based shooting & hit detection (safe, no lasers)
- Wi-Fi enabled game logic
- Web-based real-time scoreboard
- Battery-powered and portable
- Designed with cheap, easily available components

System Overview

- Pressing the trigger fires an IR signal from the gun
- The same ESP8266 listens for incoming IR hits via the vest receiver
- Game events are processed locally
- Data is sent over Wi-Fi to a web app for live score updates

This single-ESP approach reduces:
- Wiring complexity
- Cost
- Power consumption
- Debugging effort

Power System

- 4× Rechargeable NiMH AA batteries
- 1.2 V each, 1300 mAh
- Total nominal voltage: ~4.8 V

Chosen for:
- Safety
- Rechargeability
- Easy availability
- Stable current delivery for ESP8266

Components Required

A concise and accurate list is available here:
`hardware/components-list.md`

Circuit Diagram & Wiring

There is one unified circuit diagram, since a single ESP8266 handles both gun and vest logic.

Circuit diagram & wiring photos location:
'hardware/circuit-diagram'
