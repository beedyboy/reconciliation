import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('No JWT token found');
    }
    try {
      const decodedToken = this.jwtService.verify(token);
      // console.log('decodedToken', decodedToken);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid JWT token');
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    if (request.cookies && request.cookies.auth_token) {
      return request.cookies.auth_token;
    }

    if (request.headers.authorization) {
      const authHeader = request.headers.authorization;
      const [bearer, token] = authHeader.split(' ');
      if (bearer === 'Bearer' && token) {
        return token;
      }
    }

    return null;
  }
}
