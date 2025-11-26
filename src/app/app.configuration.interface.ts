import { ILanguage } from './shared/langugage.interface';

export interface IAppConfiguration {
  defaultLanguage: ILanguage;
  supportedLanguages: ILanguage[];
}
