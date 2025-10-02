from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from telegram_webapp_auth.auth import WebAppUser

from src.auth import get_current_user
from src.database import get_session
from src.models import User, UserHiddenSubject


async def get_or_create_user(
    web_app_user: WebAppUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
) -> User:
    result = await session.execute(
        select(User)
        .where(User.telegram_id == web_app_user.id)
        .options(
            selectinload(User.group),
            selectinload(User.hidden_subjects).selectinload(UserHiddenSubject.subject)
        )
    )
    user_in_db = result.scalar_one_or_none()

    hidden_subjects_set = {
        (hs.subject.name, hs.subject.teacher, hs.subject.study_type, hs.subject.subgroup)
        for hs in user_in_db.hidden_subjects
    }
    print("------------------------------", hidden_subjects_set)
    
    if not user_in_db:
        user_in_db = User(
            telegram_id=web_app_user.id,
            username=web_app_user.username
        )
        session.add(user_in_db)
        await session.commit()
        await session.refresh(user_in_db)
    
    return user_in_db