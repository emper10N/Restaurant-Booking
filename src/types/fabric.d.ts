import 'fabric';

declare module 'fabric' {
  interface Object {
    data?: any;
  }
  interface Group {
    data?: any;
  }
  interface IText {
    data?: any;
  }
  interface Line {
    data?: any;
  }
  interface Rect {
    data?: any;
  }
}