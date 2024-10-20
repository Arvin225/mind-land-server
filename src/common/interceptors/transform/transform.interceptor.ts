import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable, pipe } from 'rxjs';

export interface Response<T> {
  code: number,
  msg: string,
  data?: T
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    return next.handle().pipe(map(data => (
      {
        code: 0,
        msg: 'success',
        data
      }
    )))
  }
}
