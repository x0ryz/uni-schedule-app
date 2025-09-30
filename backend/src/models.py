from __future__ import annotations

from sqlalchemy import ForeignKey, String, DateTime, BigInteger, Column, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    site_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="group")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, nullable=False)

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=True)
    group: Mapped["Group"] = relationship(back_populates="users")