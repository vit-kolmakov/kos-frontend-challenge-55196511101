import { Component, inject } from "@angular/core";
import { AsyncService } from "@/app/services/async.service";

@Component({
  selector: "app-stats",
  standalone: true,
  templateUrl: "./stats.html",
  styleUrl: "./stats.css",
})
export class StatsComponent {
  readonly #asyncService = inject(AsyncService);

  // INFO: Surface the resource directly to the template to utilize the error and loading states
  protected readonly stats = this.#asyncService.statsResource;
}
