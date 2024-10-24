import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable, pipe } from 'rxjs';
import { Response } from 'src/common/interfaces/response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    return next.handle().pipe(map(data => (
      {
        code: 0,
        message: 'success',
        result: data
      }
    )))
  }
}
