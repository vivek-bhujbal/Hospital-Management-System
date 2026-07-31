from fastapi import APIRouter

router = APIRouter()

@router.get('/')
def read_receptionists():
    return {'message': 'Receptionists endpoint'}
