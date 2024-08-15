import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class HideSensitiveDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.hideSensitiveData(data);
      }),
    );
  }

  private hideSensitiveData(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.hideSensitiveData(item));
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (
          key === 'password' ||
          key === 'auth_token' ||
          key === 'refreshToken'
        ) {
          delete data[key];
        } else if (key === 'createdAt' || key === 'updatedAt') {
          data[key] = new Date(data[key]).toISOString();
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          data[key] = this.hideSensitiveData(data[key]);
        }
      }
    }
    return data;
  }
}
