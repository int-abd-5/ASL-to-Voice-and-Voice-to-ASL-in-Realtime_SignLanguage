FROM python:3.10-slim
WORKDIR /app
COPY ./common/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

RUN useradd -m appuser && chown -R appuser /app
USER appuser
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn"]