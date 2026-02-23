from fastapi import FastAPI, Request, HTTPException
from app.routers import ndvi

app = FastAPI()

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB

@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    return await call_next(request)


#Incluir prefijo global /api/v1 para todas las rutas de la API
app.prefix = "/api/v1"

# Incluye el router principal
app.include_router(ndvi.router, prefix=f"{app.prefix}/ndvi", tags=["ndvi"])

@app.get("/")
def read_root():
    return {"message": "NDVI backend running"}