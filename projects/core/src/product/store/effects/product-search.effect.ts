import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { NEVER, Observable, of } from 'rxjs';
import { catchError, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import { makeErrorSerializable } from '../../../util/serialization-utils';
import { ProductSearchConnector } from '../../connectors/search/product-search.connector';
import { ProductActions } from '../actions/index';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class ProductsSearchEffects {
  @Effect()
  searchProducts$: Observable<
    ProductActions.SearchProductsSuccess | ProductActions.SearchProductsFail
  > = this.actions$.pipe(
    ofType(ProductActions.SEARCH_PRODUCTS),
    groupBy((action: ProductActions.SearchProducts) => action.auxiliary),
    mergeMap(group =>
      group.pipe(
        switchMap((action: ProductActions.SearchProducts) => {
          return this.productSearchConnector
            .search(action.payload.queryText, action.payload.searchConfig)
            .pipe(
              map(data => {
                return new ProductActions.SearchProductsSuccess(
                  data,
                  action.auxiliary
                );
              }),
              catchError(error =>
                of(
                  new ProductActions.SearchProductsFail(
                    makeErrorSerializable(error),
                    action.auxiliary
                  )
                )
              )
            );
        })
      )
    )
  );

  @Effect()
  getProductSuggestions$: Observable<
    | ProductActions.GetProductSuggestionsSuccess
    | ProductActions.GetProductSuggestionsFail
  > = this.actions$.pipe(
    ofType(ProductActions.GET_PRODUCT_SUGGESTIONS),
    map((action: ProductActions.GetProductSuggestions) => action.payload),
    switchMap(payload => {
      return this.productSearchConnector
        .getSuggestions(payload.term, payload.searchConfig.pageSize)
        .pipe(
          map(suggestions => {
            if (suggestions === undefined) {
              return new ProductActions.GetProductSuggestionsSuccess([]);
            }
            return new ProductActions.GetProductSuggestionsSuccess(suggestions);
          }),
          catchError(error =>
            of(
              new ProductActions.GetProductSuggestionsFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    })
  );

  /**
   * Use product search result data to populate product list state
   */
  @Effect()
  populateProductState$: Observable<
    ProductActions.LoadProductSuccess
  > = isPlatformBrowser(this.platrofmId)
    ? this.actions$.pipe(
        ofType(ProductActions.SEARCH_PRODUCTS_SUCCESS),
        mergeMap((action: ProductActions.SearchProductsSuccess) => {
          return action.payload.products.map(
            product => new ProductActions.LoadProductSuccess(product, 'list')
          );
        })
      )
    : NEVER;

  constructor(
    private actions$: Actions,
    private productSearchConnector: ProductSearchConnector,
    @Inject(PLATFORM_ID) private platrofmId: any
  ) {}
}
