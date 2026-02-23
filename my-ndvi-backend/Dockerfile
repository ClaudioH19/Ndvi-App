FROM python:3.11-slim

WORKDIR /app

# Instala dependencias del sistema necesarias para rasterio y otros paquetes
RUN apt-get update && apt-get install -y \
    libgdal-dev \
    gdal-bin \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libxcb1

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]