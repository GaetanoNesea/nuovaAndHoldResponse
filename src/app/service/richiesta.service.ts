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
        newobj = {
          ...newobj, [objKey]: {
            Vecchio: !!obj ? obj[objKey] : null,
            Nuovo: obj2[objKey]
          }
        };
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
        if (typeof result === 'object' && arg.length > 0) {
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


  public richiestaFor<A, B>(primoObj: string, secondoObj: string): Observable<{ responseOriginale: A, responseNuova: B }> {
    return forkJoin(
      {
        responseOriginale: this.richiesta(primoObj, 'dto', 'dati-completi-oe'),
        responseNuova: this.richiesta(secondoObj, 'dto', 'dati-completi-oe')
      }
    ).pipe(
      map(({responseOriginale, responseNuova}: { responseOriginale: A, responseNuova: B }) => {
        // const obj: { nuovo: any, vecchio: any };

        for (const keyResponseOriginale in responseOriginale) {
          /**
           * Prima cosa da fare, verificare che la stessa proprietà esista in entrambi gli elementi,
           * altrimenti eliminiamo la stessa dal secondo array
           */
          // @ts-ignore
          if (responseOriginale[keyResponseOriginale] && responseNuova[keyResponseOriginale]) {
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

                    /** troviamo la key all'interno del item */
                    key = RichiestaService._keyId(item);

                    /** Cerchiamo nella seconda response se esiste un item con lo stesso id, significa ch'è stato modificato */
                      // @ts-ignore
                    const itemModificato = responseNuova[keyResponseOriginale].find((itemSecondo) => itemSecondo[key] === item[key]);

                    /** All'inizio abbiamo creato una lista vuota, in questo caso verifichiamo che la lista è vuota, nel caso che lo fosse la
                     * andiamo a riempire con il primo filtro dalla secondaResponse e successivamente elimineremo altri elementi
                     */
                    if (newItemModifica.length === 0) {
                      // @ts-ignore
                      newItemModifica = [...responseNuova[keyResponseOriginale].filter(itemSecondo => itemSecondo[key] !== item[key])];
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
                  }else{
                    /** Nel caso che l'item è una lista */
                    return item;
                  }

                });

              /** Adesso prendiamo gli elementi che non sono presenti nella primaResponse e li modifichiamo,
               * aggiungendo Vecchio e Nuovo
               */
              newItemModifica = newItemModifica.map(newItem => RichiestaService._nuovoVecchio(null, newItem));

              /** Modifichiamo le responseOriginale e con la lista modificata */
              responseOriginale = {...responseOriginale, [keyResponseOriginale]: [...arrayModificato.filter(itemModificato => !!itemModificato), ...newItemModifica]};
            } else {
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
            }
          } else {
            /**
             * Eliminiamo la proprietà non presente nel secondo elemento dal primo
             */
            delete responseOriginale[keyResponseOriginale];
          }
        }
        return {responseOriginale, responseNuova};
      })
    );
  }

}
