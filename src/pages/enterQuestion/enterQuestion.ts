import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslatedNotificationController } from "../../utils/TranslatedNotificationController";
import { TagsHelper } from "../../utils/TagsHelper";
import { QuestionServiceProvider } from "../../providers/question-service/question-service";
import { MainMenuPage } from "../mainMenu/mainMenu";

@Component({
  selector: 'page-enterQuestion',
  templateUrl: 'enterQuestion.html'
})
export class EnterQuestionPage {

  public maxTags = 3;
  public maxTextLength = 250;
  public tags = [];
  public selectedTags: number[] = [];
  public questionText: string = "";

  constructor(private navCtrl: NavController, private notifier: TranslatedNotificationController,
              private tagsHelper: TagsHelper, private questionService: QuestionServiceProvider) {
    this.tags = this.tagsHelper.getAllTagObjectsSorted();
  }

  onSelectTags() {
    if (this.selectedTags.length > 3) this.selectedTags.length = 3;
  }
    
  publishQuestion() {
    console.log('publish question');
    console.log(this.questionText);
    console.log(this.selectedTags);
    if (this.selectedTags === undefined || this.selectedTags.length == 0) {
      this.notifier.showToast('ENTERQUESTION.ERROR_NO_TAGS');
      return;
    }        
    if (this.questionText === undefined || this.questionText.length < 10) {
      this.notifier.showToast('ENTERQUESTION.ERROR_SHORT_TEXT');
      return;
    } 
    this.questionService.publishQuestion(this.questionText, this.selectedTags)
    .subscribe(
      data => {
        this.notifier.showAlert('ENTERQUESTION.POSTED_TITLE', 'ENTERQUESTION.POSTED', 'OK')
        this.navCtrl.setRoot(MainMenuPage);
      },
      err => {
        this.notifier.showToast('CONNERROR');
      }
    );
  }

}
