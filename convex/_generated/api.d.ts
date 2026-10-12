/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as dayOwnershipRepair from "../dayOwnershipRepair.js";
import type * as dayValidators from "../dayValidators.js";
import type * as days from "../days.js";
import type * as daysHttp from "../daysHttp.js";
import type * as http from "../http.js";
import type * as limits from "../limits.js";
import type * as managerAccess from "../managerAccess.js";
import type * as ownerAccess from "../ownerAccess.js";
import type * as ownerHttp from "../ownerHttp.js";
import type * as ownerReportValidators from "../ownerReportValidators.js";
import type * as ownerReports from "../ownerReports.js";
import type * as propertyAccess from "../propertyAccess.js";
import type * as propertyHttp from "../propertyHttp.js";
import type * as records from "../records.js";
import type * as salesMoneyCheck from "../salesMoneyCheck.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  dayOwnershipRepair: typeof dayOwnershipRepair;
  dayValidators: typeof dayValidators;
  days: typeof days;
  daysHttp: typeof daysHttp;
  http: typeof http;
  limits: typeof limits;
  managerAccess: typeof managerAccess;
  ownerAccess: typeof ownerAccess;
  ownerHttp: typeof ownerHttp;
  ownerReportValidators: typeof ownerReportValidators;
  ownerReports: typeof ownerReports;
  propertyAccess: typeof propertyAccess;
  propertyHttp: typeof propertyHttp;
  records: typeof records;
  salesMoneyCheck: typeof salesMoneyCheck;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
