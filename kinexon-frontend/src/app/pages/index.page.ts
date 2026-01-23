import { Component } from "@angular/core";
import { HomeComponent } from "@/app/components/home/home";

@Component({
  selector: "app-page",
  template: `<app-home />`,
  imports: [HomeComponent],
  // styles: `
  //   :host {
  //     background-color: ;
  //   }
  // `,
})
export default class IndexPage {}
