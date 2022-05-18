// Type definitions for mocha-suit@0.5.1
// Project: Mocha Suit
// Definitions by: Sukharev Kirill <SukharevKirill@gmail.com>

/// <reference types="dirty-chai" />

declare type Suit = { [key:string]: any } & { [key:number]: any };
declare type TestSet = { testSet: boolean; } & { [key:string]: Suit; }

declare interface ExtendMethod {
    (description: string, ctx: Suit, cb?: (this: MochaSuitFactory) => void): MochaSuitFactory
    (description: string, cb?: (this: MochaSuitFactory) => void): MochaSuitFactory
}

declare interface CallBack {
    (this: MochaSuitFactory, done?: (err?: any) => void): Promise<void|Assertion> | void | Assertion;
}

declare interface SetupMethod {
    (cb: CallBack): MochaSuitFactory;
    (suit: MochaSuitFactory) : MochaSuitFactory;
}

declare interface TeardownMethod {
    (cb: CallBack) : MochaSuitFactory;
    (suit: MochaSuitFactory) : MochaSuitFactory;
}

declare interface TestMethod {
    (caseDescription: string, cb: CallBack) : MochaSuitFactory;
    (suit: MochaSuitFactory) : MochaSuitFactory;
}

declare interface WithMethod {
    (suit: MochaSuitFactory) : MochaSuitFactory;
}

declare interface ReplaceMethod {
    (oldSuit: MochaSuitFactory, newSuit: MochaSuitFactory) : MochaSuitFactory;
}

declare interface SetMethod {
    (suit: MochaSuitFactory, cb: CallBack) : MochaSuitFactory;
}

declare class MochaSuitFactory {
    constructor()
    suit: Suit
}

declare interface MochaSuitFactory {
    (): void;
    (testSet: TestSet): void;
    (suits: Suit[]): void;
    (suit: Suit): void;
    after: TeardownMethod;
    afterAll: TeardownMethod;
    afterEach: TeardownMethod;
    assertMatchBetween: (payload:any, expectations:any) => void;
    expectMatchBetween: (payload:any, expectations:any) => void;
    expectRejectionMessage: (handler:Function, errorMessage:string) => void;
    expectRejectionWithProperties: (handler:Function, errorProperties:object) => void;
    expectToBeNull: (value:any) => void;
    expectToBeUndefined: (value:any) => void;
    before: SetupMethod;
    beforeAll: SetupMethod;
    beforeEach: SetupMethod;
    extend: ExtendMethod;
    it: TestMethod;
    only: TestMethod;
    replaceWith: ReplaceMethod;
    run: () => void;
    setAfter: SetMethod;
    setAfterAll: SetMethod;
    setBefore: SetMethod;
    setBeforeAll: SetMethod;
    stubContext: (overrides:Object) => Object;
    stubReturning: (params:any) => Function;
    stubResolving: (params:any) => Function;
    stubRejecting: (params:any) => Function;
    timeout: (duration:number) => void;
    that: TestMethod;
    with: WithMethod;
    xit: TestMethod;
    xthat: TestMethod;
    [key:string]: MochaSuitFactory | Function | Suit
}

declare type SuiteOptions = { category:string, method: string, project?:string, service:string }
declare function MochaSuitModule(options: SuiteOptions): MochaSuitFactory;

export = MochaSuitModule;
