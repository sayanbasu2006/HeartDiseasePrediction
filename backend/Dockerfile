FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements*.txt backend/
RUN pip install --no-cache-dir -r backend/requirements-lock.txt
COPY backend backend
ENV OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
EXPOSE 8000
CMD ["uvicorn","backend.api.main:app","--host","0.0.0.0","--port","8000","--no-access-log"]
