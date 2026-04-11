"""
Custom user model for the Wave platform.

Uses email as the primary authentication identifier with a custom
manager for user/superuser creation.
"""

from __future__ import annotations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class CustomUserManager(BaseUserManager):
    """Manager for creating users and superusers via email."""

    def create_user(
        self, email: str, password: str | None = None, **extra_fields: object
    ) -> "CustomUser":
        """
        Create and return a regular user with the given email and password.

        Raises:
            ValueError: If the email field is empty.
        """
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: object
    ) -> "CustomUser":
        """
        Create and return a superuser with the given email and password.

        Raises:
            ValueError: If ``is_staff`` or ``is_superuser`` is not ``True``.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """
    Custom user model using email as the unique login identifier.

    Extends Django's ``AbstractUser`` to add:
    - Email-based authentication (instead of username)
    - Profile photo support
    - Automatic ``created_at`` / ``updated_at`` timestamps
    """

    email = models.EmailField(
        unique=True,
        help_text="Primary email address used for login.",
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Display name shown to other users.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_photo = models.ImageField(
        upload_to="profile_photo/",
        null=True,
        blank=True,
        help_text="User's profile photo.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        """Return the user's full name, falling back to the email."""
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.email