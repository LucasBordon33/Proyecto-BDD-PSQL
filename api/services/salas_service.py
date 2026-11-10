from api.repositories import salas_repo

async def get_salas(pool) -> list[dict]:
    return await salas_repo.get_salas(pool)