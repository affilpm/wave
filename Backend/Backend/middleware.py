from channels.middleware.base import BaseMiddleware
import json

class JWTAuthMiddleware(BaseMiddleware):
    async def connect(self):
        # Check for JWT token or any other logic
        token = self.scope.get('user')
        if not token or not token.is_authenticated:
            await self.close()  # Close connection if not authenticated
        else:
            await super().connect()