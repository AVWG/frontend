import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Store } from '@ngxs/store';
import { UserActions } from '@plusme/libs/actions/users.actions';

@Component({
  selector: 'app-page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  authForm: FormGroup;
  email: AbstractControl;
  password: AbstractControl;

  constructor(
    private store: Store,
    private fb: FormBuilder,
  ) {
    this.authForm = this.fb.group({
      email: ['', Validators.compose([Validators.required])],
      password: ['', Validators.compose([Validators.required])]
    });

    this.email = this.authForm.controls.email;
    this.password = this.authForm.controls.password;
  }

  ionViewDidEnter() {

  }

  login() {
    if (!this.authForm.valid) {return;}

    this.store.dispatch(new UserActions.LoginAction(
      this.email.value,
      this.password.value,
    ));

    return false;
  }

  forgotPW() {
    console.log('forgot PW');
    // this.userService.forgotPW(this.email.value)
    // .subscribe(
    //   res => this.notifier.showAlert('', 'SIGNUP.RESETMAIL', 'OK'),
    //   err => this.notifier.showToast('LOGIN.INVALID_USER')
    // );
    return false;
  }
}
