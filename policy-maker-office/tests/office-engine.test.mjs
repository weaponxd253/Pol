import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,getEvent,selectResponse,beginPolicyPhase,getPolicies,policyDetails,selectPolicy,calculateTurn,resolveTurn,advanceTurn} from '../js/engine.js';

for (const mode of ['quick','term']) {
  test(`${mode}: briefing -> policy -> preview -> report -> advance`, () => {
    let state=createInitialState({mode,seed:'OFFICE-TEST'});
    assert.equal(state.phase,'event');
    const response=getEvent(state).responses[0];
    state=beginPolicyPhase(selectResponse(state,response.id));
    assert.equal(state.phase,'policy');
    const policy=getPolicies(state).filter(p=>state.hand.includes(p.id)).map(p=>policyDetails(state,p)).find(p=>!p.disabledReason);
    assert.ok(policy);
    state=selectPolicy(state,policy.id);
    const projected=calculateTurn(state);
    assert.equal(projected.turn,1);
    state=resolveTurn(state);
    assert.equal(state.phase,'report');
    assert.equal(state.history.length,1);
    state=advanceTurn(state);
    assert.equal(state.turn,2);
    assert.equal(state.phase,'event');
  });
}
