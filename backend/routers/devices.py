from fastapi import APIRouter

router = APIRouter()

devices_data = [
    {
        "id": "pc",
        "name": "Custom PC",
        "description": "Build your own desktop PC from scratch",
        "parts": [
            {"id": "cpu", "name": "CPU", "spec": "Intel i7-13700K"},
            {"id": "motherboard", "name": "Motherboard", "spec": "ATX Z790"},
            {"id": "ram", "name": "RAM", "spec": "16GB DDR5"},
            {"id": "gpu", "name": "GPU", "spec": "RTX 4070"},
            {"id": "storage", "name": "SSD", "spec": "1TB NVMe"},
            {"id": "psu", "name": "PSU", "spec": "750W 80+ Gold"},
        ]
    },
    {
        "id": "camera",
        "name": "DIY Camera",
        "description": "Assemble a digital camera module",
        "parts": [
            {"id": "sensor", "name": "Image Sensor", "spec": "12MP CMOS"},
            {"id": "lens", "name": "Lens Module", "spec": "28mm f/2.0"},
            {"id": "processor", "name": "Image Processor", "spec": "Digic X"},
            {"id": "battery", "name": "Battery", "spec": "1800mAh Li-ion"},
            {"id": "screen", "name": "LCD Screen", "spec": "3 inch IPS"},
        ]
    },
    {
        "id": "keychain",
        "name": "Programmable Keychain",
        "description": "Build a tiny programmable display badge",
        "parts": [
            {"id": "mcu", "name": "Microcontroller", "spec": "RP2040"},
            {"id": "display", "name": "OLED Display", "spec": "128x64px"},
            {"id": "battery", "name": "Battery", "spec": "110mAh LiPo"},
            {"id": "button", "name": "Buttons", "spec": "x3 tactile"},
            {"id": "case", "name": "Case", "spec": "3D printed"},
        ]
    }
]

@router.get("/")
def get_devices():
    return devices_data

@router.get("/{device_id}")
def get_device(device_id: str):
    device = next((d for d in devices_data if d["id"] == device_id), None)
    if not device:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.get("/{device_id}/parts")
def get_parts(device_id: str):
    device = next((d for d in devices_data if d["id"] == device_id), None)
    if not device:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Device not found")
    return device["parts"]