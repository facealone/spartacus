import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  InterceptorUtil,
  USE_CLIENT_TOKEN,
} from '../../occ/utils/interceptor-util';
import { AuthService } from '../facade/auth.service';
import { ClientErrorHandlingService } from '../services/client-error/client-error-handling.service';
import { UserErrorHandlingService } from '../services/user-error/user-error-handling.service';

const OAUTH_ENDPOINT = '/authorizationserver/oauth/token';

enum HttpResponseStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
}

@Injectable({ providedIn: 'root' })
export class AuthErrorInterceptor implements HttpInterceptor {
  constructor(
    private userErrorHandlingService: UserErrorHandlingService,
    private clientErrorHandlingService: ClientErrorHandlingService,
    private authService: AuthService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const isClientTokenRequest = this.isClientTokenRequest(request);
    if (isClientTokenRequest) {
      request = InterceptorUtil.removeHeader(USE_CLIENT_TOKEN, request);
    }

    return next.handle(request).pipe(
      catchError((errResponse: any) => {
        if (errResponse instanceof HttpErrorResponse) {
          switch (errResponse.status) {
            case HttpResponseStatus.UNAUTHORIZED: // Unauthorizedb
              if (isClientTokenRequest) {
                if (this.isExpiredToken(errResponse)) {
                  return this.clientErrorHandlingService.handleExpiredClientToken(
                    request,
                    next
                  );
                }
                // user token request
              } else {
                if (this.isExpiredToken(errResponse)) {
                  return this.userErrorHandlingService.handleExpiredUserToken(
                    request,
                    next
                  );
                } else if (
                  // Refresh expired token
                  // Check that the OAUTH endpoint was called and the error is for refresh token is expired
                  errResponse.url.includes(OAUTH_ENDPOINT) &&
                  errResponse.error.error === 'invalid_token'
                ) {
                  this.userErrorHandlingService.handleExpiredRefreshToken();
                  return of();
                }
              }
              break;
            case HttpResponseStatus.BAD_REQUEST: // Bad Request
              if (
                errResponse.url.includes(OAUTH_ENDPOINT) &&
                errResponse.error.error === 'invalid_grant'
              ) {
                if (request.body.get('grant_type') === 'refresh_token') {
                  // refresh token fail, force user logout
                  this.authService.logout();
                }
              }
              break;
          }
        }
        return throwError(errResponse);
      })
    );
  }

  private isClientTokenRequest(request: HttpRequest<any>): boolean {
    const isRequestMapping = InterceptorUtil.getInterceptorParam(
      USE_CLIENT_TOKEN,
      request.headers
    );
    return Boolean(isRequestMapping);
  }

  private isExpiredToken(resp: HttpErrorResponse): boolean {
    if (
      resp.error &&
      resp.error.errors &&
      resp.error.errors instanceof Array &&
      resp.error.errors[0]
    ) {
      return resp.error.errors[0].type === 'InvalidTokenError';
    }
    return false;
  }
}
