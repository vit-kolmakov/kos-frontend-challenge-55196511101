import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AssetService } from "@/app/services/asset.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
