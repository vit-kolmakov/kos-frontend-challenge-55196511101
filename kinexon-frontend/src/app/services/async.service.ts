import { inject, Injectable } from "@angular/core";
import { httpResource } from "@angular/common/http";
import { AssetMetadata, RawSystemStatistics } from "../models/asset.model";

const BASE_URL = "http://localhost:8080/api";
const OBJECTS_ROUTE = BASE_URL + "/objects";
const STATS_ROUTE = BASE_URL + "/stats";

@Injectable({
  providedIn: "root",
})
export class AsyncService {
  /**
   * INFO: Fetches the static metadata for all 250 map objects.
   */
  public readonly assetsResource = httpResource<AssetMetadata[]>(
    () => OBJECTS_ROUTE,
  );

  /**
   * INFO: Fetches the system statistics for the simulation.
   */
  public readonly statsResource = httpResource<RawSystemStatistics>(
    () => STATS_ROUTE,
  );
}
