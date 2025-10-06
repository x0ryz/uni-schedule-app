from __future__ import annotations

from sqlalchemy import ForeignKey, String, BigInteger, UniqueConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    site_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    faculty: Mapped[str] = mapped_column(String)
    semester: Mapped[int] = mapped_column(Integer)

    users: Mapped[list["User"]] = relationship(back_populates="group")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="group")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=True)
    
    group: Mapped["Group"] = relationship(back_populates="users")
    hidden_subjects: Mapped[list["UserHiddenSubject"]] = relationship(
        "UserHiddenSubject",
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    teacher: Mapped[str] = mapped_column(String, nullable=False)
    study_type: Mapped[str] = mapped_column(String, nullable=False)
    subgroup: Mapped[str] = mapped_column(String, nullable=True)

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=False)
    group: Mapped["Group"] = relationship(back_populates="subjects")

class UserHiddenSubject(Base):
    __tablename__ = "user_hidden_subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="hidden_subjects")
    subject: Mapped["Subject"] = relationship("Subject")

    __table_args__ = (
        UniqueConstraint("user_id", "subject_id", name="uq_user_subject"),
    )
