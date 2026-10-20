"""Common response and error models."""
from __future__ import annotations
from typing import Optional, Any, Dict
from .compat import BaseModel, Field

class ApiResponse(BaseModel):
    """Standard success API response envelope."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    """Standard structured error response."""
    success: bool = False
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ServiceStatus(BaseModel):
    """Status report for third-party service connections."""
    name: str
    configured: bool
    status: str # "connected", "not_configured", "error"
    message: str
    details: Optional[Dict[str, Any]] = None

class HealthStatusResponse(BaseModel):
    """System health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    environment: str
    services: Dict[str, ServiceStatus]
