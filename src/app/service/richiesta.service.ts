import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RichiestaService {

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

  public richiestaFor<A, B>(primoObj: string, secondoObj: string): Observable<{primo: A, secondo: B}> {
    return forkJoin(
      {
        primo: this.richiesta(primoObj, 'dto', 'dati-completi-oe'),
        secondo: this.richiesta(secondoObj, 'dto', 'dati-completi-oe')
      }
    ).pipe(
      map(({primo, secondo}: { primo: A, secondo: B }) => {
        // const obj: { nuovo: any, vecchio: any };

        for (const primoKey in primo) {
          // @ts-ignore
          if (primo[primoKey] && secondo[primoKey]) {
            // return obj = {
            //   nuovo: secondo[primoKey],
            //   vecchio: primo[primoKey]
            // };
            primo = {...primo, [primoKey]: {
                vecchio: primo[primoKey],
                // @ts-ignore
                nuovo: secondo[primoKey]
              }};
          } else {
            // return {primo: {...primo}, secondo: {...secondo}};
          }
        }
        return {primo, secondo};
      })
    );
  }

}
