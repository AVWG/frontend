import { Action, State, StateContext, Store } from '@ngxs/store';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_ENDPOINT } from '@plusme/app/app.config';
import {
  catchError,
  tap,
  map,
  switchMap,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { Injectable } from '@angular/core';
import { TranslatedNotificationController } from '@plusme/utils/TranslatedNotificationController';
import { FrontendRoutes } from '@plusme/libs/enums/frontend-routes.enum';
import { UserActions } from '@plusme/libs/actions/users.actions';
import { plainToClass } from 'class-transformer';
import { UserModel } from '@plusme/libs/models/user.model';
import { TranslateService } from '@ngx-translate/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Navigate } from '@ngxs/router-plugin';
import urlcat from 'urlcat';
import { BackendRoutes } from '@plusme/libs/enums/backend-routes.enum';
import { uniq } from 'lodash';
import { PackageJson } from 'type-fest';

const semver = require('semver');

const packageJSON = require('../../../package.json') as PackageJson;

export interface UserStateInterface {
  isLoggedIn: boolean;
  token?: string;
  user?: UserModel;
  Version?: string;
  hasOnboardingFinished: boolean;
  votes: { [id: number]: boolean};
  seen: number[];
}

@State<UserStateInterface>({
  name: 'user',
  defaults: {
    isLoggedIn: false,
    hasOnboardingFinished: false,
    votes: {},
    seen: []
  }
})
@Injectable()
export class UserState {
  private appVersion = packageJSON.version;

  public constructor(
    private http: HttpClient,
    private notifier: TranslatedNotificationController,
    private store: Store,
    private translate: TranslateService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
  }

  @Action(UserActions.LoginAction)
  public login(
    ctx: StateContext<UserStateInterface>,
    action: UserActions.LoginAction,
  ) {

    return this
      .http
      .post<any>(
        API_ENDPOINT + '/Users/token/',
        {
          email: action.email,
          password: action.password,
          version: this.appVersion
        },
      )
      .pipe(
        switchMap(data => {
          ctx.patchState({
            isLoggedIn: true,
            token: data.Token,
          });
          this.semVerCheck(data);
          return this.store.dispatch(new UserActions.ValidateToken());
        }),
        tap(() => {
          this.store.dispatch(new Navigate([
            FrontendRoutes.RandomQuestion,
          ]));
        }),
        catchError(async (_err) => {
          ctx.patchState({
            isLoggedIn: false,
            token: undefined,
          });
          console.error(_err);

          await this.notifier.showToast('LOGIN.FAILED');
        }),
      );
  }

  @Action(UserActions.LogoutAction)
  public logout(
    ctx: StateContext<UserStateInterface>,
  ) {
    return this
      .http
      .get<any>(
        API_ENDPOINT + '/Users/logout/',
        {}
      )
      .pipe(
        catchError(() => {
          ctx.patchState({
            isLoggedIn: false,
            token: undefined,
            user: undefined,
          });

          this.store.dispatch(new Navigate([
            FrontendRoutes.Welcome,
          ]));

          return of();
        }),
        tap(() => {
          console.dir('tap');
          ctx.patchState({
            isLoggedIn: false,
            token: undefined,
            user: undefined,
          });

          this.store.dispatch(new Navigate([
            FrontendRoutes.Welcome,
          ]));
        })
      );
  }

  @Action(UserActions.FinishedOnboarding)
  public finishedOnboarding(
    ctx: StateContext<UserStateInterface>,
  ) {
    ctx.patchState({
      hasOnboardingFinished: true
    });

    if (ctx.getState().isLoggedIn === true) {
      this.store.dispatch(new Navigate([
        FrontendRoutes.RandomQuestion,
      ]));
    } else {
      this.store.dispatch(new Navigate([
        FrontendRoutes.Welcome,
      ]));
    }
  }

  @Action(UserActions.ValidateToken)
  public validateToken(
    ctx: StateContext<UserStateInterface>,
  ) {
    return this
      .http
      .get<unknown>(`${ API_ENDPOINT }/Users/me/`)
      .pipe(
        map(data => plainToClass(
          UserModel,
          data,
        )),
        tap((user) => {
          ctx.patchState({
            user,
          });
          this.semVerCheck(user);
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isLoggedIn: false,
            user: undefined,
            token: undefined,
          });
          console.error(error);

          return of(error);
        })
      );
  }

  @Action(UserActions.RegisterAction)
  public register(
    _ctx: StateContext<UserStateInterface>,
    action: UserActions.RegisterAction,
  ) {
    return this
      .http
      .post<any>(
        API_ENDPOINT + '/Users/',
        JSON.stringify({
          email: action.email,
          password: action.password,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      .pipe(
        tap(async () => {
          const alert = await this.alertCtrl.create({
            message: this.translate.instant('signup.checkEmail'),
            backdropDismiss: false,
            buttons: [{
              text: this.translate.instant('signup.ok'),
              handler: () => {
                this.store.dispatch(new Navigate([
                  FrontendRoutes.Login,
                ]));
              }
            }]
          });

          await alert.present();
        }),
        catchError(async (error: Error | HttpErrorResponse) => {
          const unknown = (error instanceof HttpErrorResponse ?
            error.statusText === 'Unknown Error' : false);
          let message = (error instanceof HttpErrorResponse ?
            error.error.message :
            error.message);
          if (unknown === true || message === undefined || message === '') {
            message = this.translate.instant('signup.unknownSignupError');
          }
          const toast = await this.toastCtrl.create({
            message,
            duration: 30000,
            buttons: [
              {
                side: 'end',
                icon: 'retry',
                text: this.translate.instant('signup.retry'),
                handler: () => {
                  this.store.dispatch(new Navigate([
                    FrontendRoutes.SignUp,
                  ]));
                }
              }
            ]
          });

          await toast.present();

          this.store.dispatch(new Navigate([
            FrontendRoutes.Contact,
          ]));
        }),
      );
  }

  @Action(UserActions.GetVotes)
  public getVotes(
    ctx: StateContext<UserStateInterface>,
  ) {
    return this
      .http
      .get(
        urlcat(API_ENDPOINT, BackendRoutes.MyVotes),
      )
      .pipe(
        map((x: {question: number;up: boolean}[]) => {
          const normalizedObject: any = {};
          for (const element of x) {
            normalizedObject[element.question] = element.up;
          }
          return normalizedObject;
        }),
        tap(userVotes => {
          ctx.patchState({votes: userVotes});
        }),
      );
  }

  @Action(UserActions.MarkSeen)
  public markSeen(
    ctx: StateContext<UserStateInterface>,
    action: UserActions.MarkSeen,
  ) {
    const state = ctx.getState();
    if (!Array.isArray(state.seen)) {
      ctx.patchState({
        seen: [action.questionId],
      });
    } else {
      const seen = uniq([
        ...state.seen,
        action.questionId,
      ]);
      ctx.patchState({
        seen,
      });
    }
  }

  public semVerCheck(data) {
    if (semver.gte(this.appVersion, data.Version) === false) {
      this.notifier.showToast('newVersion', 10000);
    }
  }
}
