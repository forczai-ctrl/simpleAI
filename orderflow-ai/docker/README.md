# Docker Notes

`docker-compose.yml` starts the MVP application plus the open-source services named in the requirements:

- PostgreSQL
- Redis
- ChromaDB
- MinIO
- Ollama
- n8n
- Keycloak

Superset is intentionally left out of the default compose file because it materially increases startup time and memory usage. Add it once PostgreSQL persistence and dashboard datasets are finalized.

