import {
    HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { of, Observable } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { GlobalState } from '@plusme/libs/interfaces/global.state';
import { UserActions } from '../actions/users.actions';

/**
 * Interceptor for authentication
 */
@Injectable()
export class AppInterceptor implements HttpInterceptor {

  public constructor(
    private store: Store,
  ) { }

  /**
   * Add authentication token to every request
   *
   * @param req http request
   * @param next http handler
   */
  public intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (req.url.startsWith('./assets')) {
      return next.handle(req);
    }

    req.headers.set('Content-Type', 'application/json');
    const token = this
        .store
        .selectSnapshot((state: GlobalState) => state.user.token);

    return of(token)
      .pipe(
        map((token) => {
          if (typeof token === 'string') {
            return req
              .clone({
                setHeaders: {
                  'content-type': 'application/json',
                  authorization: `Token ${token}`,
                },
              });
          } else {
            return req;
          }
        }),
        switchMap(switchReq => next.handle(switchReq)),
        catchError((error) => {
          if ((error instanceof HttpErrorResponse) && (error.status === 403) && (typeof token === 'string')) {
            return this.store.dispatch(new UserActions.LogoutAction());
          }
          throw error;
        }),
      );
  }
}
