import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {isArray} from 'rxjs/internal-compatibility';

@Injectable({
  providedIn: 'root'
})
export class RichiestaService {

  private static _nuovoVecchio<T, K extends keyof T, A>(obj: T, obj2: T): T {
    let newobj = !!obj ? obj : obj2;

    for (const objKey in newobj) {
      if (obj2[objKey]) {
        switch (typeof newobj[objKey]) {
          case 'undefined':
            break;
          case 'object':
            // console.log(`passa da qui per ${objKey}`);
            const format = RichiestaService._nuovoVecchio(newobj[objKey], obj2[objKey]);
            newobj[objKey] = {
              ...format
            };
            // console.log(format);
            break;
          case 'boolean':
          case 'number':
          case 'string':
            newobj = {
              ...newobj, [objKey]: {
                Vecchio: !!obj ? obj[objKey] : null,
                Nuovo: obj2[objKey]
              }
            };
            break;
          case 'function':
            break;
          case 'symbol':
            break;
          case 'bigint':
            break;
        }
      } else {
        delete newobj[objKey];
      }
    }
    return newobj;
  }

  private static _keyId<T>(obj: T): string {
    for (const objKey in obj) {
      if (objKey.indexOf('id', 0) > -1) {
        return objKey;
      }
    }
  }


  constructor(
    readonly http: HttpClient
  ) {
  }

  public richiesta<T, K extends keyof T>(name: string, ...arg: string[]): Observable<T> {

    return this.http.get<T>(`./assets/${name}.json`).pipe(
      map(result => {
        let obj: T;
        if (typeof result === 'object' && !!arg && arg.length > 0) {
          for (let i = 0; i < arg.length; i++) {
            if (!obj) {
              obj = result[arg[i]];
            } else {
              obj = obj[arg[i]];
            }
          }
          return obj;
        } else {
          return result;
        }
      }),
    );
  }


  /** La response deve essere un dto completo per il momento, nel caso di registrazione dobbiamo inserire i params per farlo funzionare */
  public richiestaFor<A, B>(primoObj: string, secondoObj: string, albo = true, ...arg: string[]): Observable<{ responseOriginale: A, responseNuova: B }> {
    return forkJoin(
      {
        responseOriginale: this.richiesta(primoObj, ...arg),
        responseNuova: this.richiesta(secondoObj, ...arg)
      }
    ).pipe(
      map(({responseOriginale, responseNuova}: { responseOriginale: A, responseNuova: B }) => {
        // const obj: { nuovo: any, vecchio: any };

        for (const keyResponseOriginale in responseOriginale) {
          /**
           * Prima cosa da fare, verificare che la stessa propriet?? esista in entrambi gli elementi,
           * altrimenti eliminiamo la stessa dal secondo array
           */
          // @ts-ignore
          if (!!responseOriginale[keyResponseOriginale] && !!responseNuova[keyResponseOriginale]) {
            /**
             * Prima valutiamo se abbiamo un Array oppure un object
             */
            if (isArray(responseOriginale[keyResponseOriginale])) {
              let key: string;
              let newItemModifica = [];


              /**
               * Facendo una iterazione all'interno della lista modifico gli elementi della lista della responseOriginale in modo
               * dhe dopo la possiamo sostituire alla responseOriginale.
               */
                // @ts-ignore
              const arrayModificato = (responseOriginale[keyResponseOriginale]).map((item, index) => {


                  if (!isArray(item)) {

                    /** Troviamo la key all'interno del item */
                    key = RichiestaService._keyId(item);

                    /** Cerchiamo nella seconda response se esiste un item con lo stesso id, significa ch'?? stato modificato */
                      // @ts-ignore
                    const itemModificato = responseNuova[keyResponseOriginale].find((itemSecondo) => itemSecondo[albo ? `${key}Parent` : key] === item[key]);

                    /**
                     * All'inizio abbiamo creato una lista vuota, in questo caso verifichiamo che la lista ?? vuota, nel caso che lo fosse la
                     * andiamo a riempire con il primo filtro dalla secondaResponse e successivamente elimineremo altri elementi
                     */
                    if (newItemModifica.length === 0 && !index ) {
                      // @ts-ignore
                      newItemModifica = [...responseNuova[keyResponseOriginale].filter(itemSecondo => itemSecondo[albo ? `${key}Parent` : key] !== item[key])];
                    } else {
                      newItemModifica = newItemModifica.filter(itemnew => itemnew[key] !== item[key]);
                    }

                    /** Nel caso che esista un elemento con lo stesso id nella lista primaResponse e secondaResponse
                     * allora modifichiamo item della primaResponse con aggiunta di Vecchio e Nuovo
                     */
                    if (itemModificato) {
                      item = RichiestaService._nuovoVecchio(item, itemModificato);
                    } else {
                      item = null;
                    }
                    /** Restituisce item modificato oppure a null */
                    return item;
                  } else {
                    /** Nel caso che l'item ?? una lista */
                    return item;
                  }

                });

              /** Adesso prendiamo gli elementi che non sono presenti nella primaResponse e li modifichiamo,
               * aggiungendo Vecchio e Nuovo
               */
              newItemModifica = newItemModifica.map(newItem => RichiestaService._nuovoVecchio(null, newItem));

              /** Modifichiamo le responseOriginale e con la lista modificata */
              responseOriginale = {
                ...responseOriginale,
                [keyResponseOriginale]: [...arrayModificato.filter(itemModificato => !!itemModificato), ...newItemModifica]
              };
            } else {
              switch (typeof responseOriginale[keyResponseOriginale]) {
                case 'undefined':
                  break;
                case 'object':
                  // this._forItem(responseOriginale[keyResponseOriginale]);
                  // @ts-ignore
                  const newObj = RichiestaService._nuovoVecchio(responseOriginale[keyResponseOriginale], responseNuova[keyResponseOriginale]);
                  // console.log(newObj);
                  responseOriginale = {
                    ...responseOriginale, [keyResponseOriginale]: {
                      ...newObj
                    }
                  };

                  break;
                case 'boolean':
                case 'number':
                case 'string':
                  /**
                   * In questo caso abbiamo un object da valutare, inserendo un nuovo elemento o un vecchio elemento
                   */
                  responseOriginale = {
                    ...responseOriginale, [keyResponseOriginale]: {
                      Vecchio: responseOriginale[keyResponseOriginale],
                      // @ts-ignore
                      Nuovo: responseNuova[keyResponseOriginale]
                    }
                  };
                  break;
                case 'function':
                  break;
                case 'symbol':
                  break;
                case 'bigint':
                  break;
              }

            }
          } else {
            /**
             * Eliminiamo la propriet?? non presente nel secondo elemento dal primo
             */
            delete responseOriginale[keyResponseOriginale];
          }
        }
        return {responseOriginale, responseNuova};
      })
    );
  }

}
