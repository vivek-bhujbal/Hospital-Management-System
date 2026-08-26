from fastapi import APIRouter, Depends

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.models.all_models import User

router = APIRouter()

@router.get('/')
def read_receptionists(current_user: User = Depends(require_permission(Permission.staff_view))):
    return {'message': 'Receptionists endpoint'}
