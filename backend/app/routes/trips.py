"""Trips CRUD routes with Supabase Auth identity verification and RLS."""
from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Header, HTTPException, status, Body

from app.schemas.trip import TripCreate, TripUpdate
from app.schemas.itinerary import ActivityUpdate
from app.services.supabase_service import supabase_service, SupabaseServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trips", tags=["Trips CRUD"])

def _extract_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED", "message": "Missing Authorization header with Bearer token."}
        )
    token = authorization.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED", "message": "Bearer token is empty."}
        )
    return token

@router.get("", summary="List user's trips")
async def list_trips(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        # Verify user token first
        user = await supabase_service.verify_user_token(token)
        trips = await supabase_service.list_trips(token)
        return {"success": True, "data": trips, "user_id": user.get("id")}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )

@router.get("/{trip_id}", summary="Get detailed trip with days and activities")
async def get_trip(trip_id: str, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        await supabase_service.verify_user_token(token)
        trip = await supabase_service.get_trip_detail(trip_id, token)
        return {"success": True, "data": trip}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )

@router.post("", status_code=status.HTTP_201_CREATED, summary="Save complete trip with itinerary days and activities")
async def create_trip(payload: Dict[str, Any], authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        user = await supabase_service.verify_user_token(token)
        user_id = user.get("id")

        # Extract days and trip fields
        days = payload.pop("days", [])
        created_trip = await supabase_service.create_trip_with_itinerary(
            trip_data=payload,
            days_data=days,
            user_id=user_id,
            user_token=token
        )
        return {"success": True, "data": created_trip}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )

@router.put("/{trip_id}", summary="Update trip properties")
async def update_trip(trip_id: str, updates: Dict[str, Any], authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        await supabase_service.verify_user_token(token)
        updated = await supabase_service.update_trip(trip_id, updates, token)
        return {"success": True, "data": updated}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )

@router.delete("/{trip_id}", summary="Delete a trip")
async def delete_trip(trip_id: str, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        await supabase_service.verify_user_token(token)
        await supabase_service.delete_trip(trip_id, token)
        return {"success": True, "message": "Trip successfully deleted."}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )

@router.patch("/activities/{activity_id}", summary="Update a single activity")
async def update_activity(
    activity_id: str, updates: Dict[str, Any], authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    token = _extract_token(authorization)
    try:
        await supabase_service.verify_user_token(token)
        updated = await supabase_service.update_activity(activity_id, updates, token)
        return {"success": True, "data": updated}
    except SupabaseServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "SUPABASE_ERROR", "message": exc.message, "details": exc.details}
        )
