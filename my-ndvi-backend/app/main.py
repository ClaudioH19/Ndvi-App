from fastapi import FastAPI, Request, HTTPException
from app.routers import ndvi
import gzip

app = FastAPI()

app.prefix = "/api/v1"
app.include_router(ndvi.router, prefix=f"{app.prefix}/ndvi", tags=["ndvi"])

@app.get("/")
def read_root():
    return {"message": "NDVI backend running"}