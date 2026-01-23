import { Component } from "@angular/core";
import { ControlPanelComponent } from "@/app/components/control-panel/control-panel";
import { MapComponent } from "@/app/components/map/map";
import { StatsComponent } from "@/app/components/stats/stats";

@Component({
  selector: "app-home",
  templateUrl: "./home.html",
  styleUrl: "./home.css",
  imports: [ControlPanelComponent, MapComponent, StatsComponent],
})
export class HomeComponent {}
