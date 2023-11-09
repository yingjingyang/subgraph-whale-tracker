import { Address, BigInt,store } from "@graphprotocol/graph-ts"
import {
  Supplied as SuppliedEvent,
  Borrowed as BorrowedEvent,
  Repaid as RepaidEvent,
  Withdrawn as WithdrawnEvent,
  Liquidated as LiquidatedEvent
} from "../generated/MorphoAaveV2/MorphoAaveV2"

import { Whale, AaveV2Position } from "../generated/schema"

const zeroBigInt = BigInt.fromString("0")

function convetTokenToName(poolToken:string): string{
  if(poolToken == "0x028171bca77440897b824ca71d1c56cac55b68a3"){
    return "DAI"
  }else if(poolToken == "0x030ba81f1c18d280636f32af80b9aad02cf0854e"){
    return "ETH"
  }else if(poolToken == "0xbcca60bb61934080951369a648fb03df4f96263c"){
    return "USDC"
  }else if(poolToken == "0x3ed3b47dd13ec9a98b44e6204a523e766b225811"){
    return "USDT"
  }else if(poolToken == "0x9ff58f4ffb29fa2266ab25e75e2a8b3503311656"){
    return "WBTC"
  }else if(poolToken == "0x1982b2f5814301d4e9a8b0201555376e62f82428"){
    return "stETH"
  }else if(poolToken == "0x8dae6cb04688c62d939ed9b68d32bc62e49970b1"){
    return "CRV"
  }else{
    return poolToken
  }
}

function checkWhale(userId:string): void{
  let whale = Whale.load(userId)
  if(whale === null){
    whale = new Whale(userId)
    whale.save()
  }
}

function getPosition(userId:string,tokenId:string): AaveV2Position{
  let tokenName = convetTokenToName(tokenId)
  let positionId = userId.concat(tokenId)
  let aaveV2Position = AaveV2Position.load(positionId)
  if(aaveV2Position === null){
    let zeroBigInt = BigInt.fromString("0")
    aaveV2Position = new AaveV2Position(positionId)
    aaveV2Position.userId = userId
    aaveV2Position.tokenName = tokenName
    aaveV2Position.borrowAmount = zeroBigInt
    aaveV2Position.supplyAmount = zeroBigInt
    aaveV2Position.whale = userId
    aaveV2Position.save()
  }

  return aaveV2Position
}

function handleSupply(userId:string,tokenId:string,amount:BigInt): void{
  checkWhale(userId)

  let aaveV2Position = getPosition(userId,tokenId)
  let newPositionSupplyAmount = aaveV2Position.supplyAmount.plus(amount)
  aaveV2Position.supplyAmount = newPositionSupplyAmount

  aaveV2Position.save()
}

export function handleAveV2Supplied(event: SuppliedEvent): void {
  let userId = event.params._onBehalf.toHexString()
  let poolToken = event.params._poolToken.toHexString()
  handleSupply(userId,poolToken,event.params._amount)
}


export function handleAveV2Borrowed(event: BorrowedEvent): void {
  let userId = event.params._borrower.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let tokenId = event.params._poolToken.toHexString()
  let aaveV2Position = getPosition(userId,tokenId)
  let newPositionBorrowAmount = aaveV2Position.borrowAmount.plus(changeAmount)
  aaveV2Position.borrowAmount = newPositionBorrowAmount

  aaveV2Position.save()

}

export function handleAveV2Repaid(event: RepaidEvent): void {
  let userId = event.params._onBehalf.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let tokenId = event.params._poolToken.toHexString()
  let aaveV2Position = getPosition(userId,tokenId)
  let newPositionBorrowAmount = aaveV2Position.borrowAmount.minus(changeAmount)
  if(newPositionBorrowAmount.le(zeroBigInt)){
    store.remove('AaveV2Position',aaveV2Position.id)
  }else{
    aaveV2Position.borrowAmount = newPositionBorrowAmount
    aaveV2Position.save()
  }
  
}

export function handleAveV2Withdrawn(event: WithdrawnEvent): void {
  let userId = event.params._supplier.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let poolToken = event.params._poolToken.toHexString()
  let aaveV2Position = getPosition(userId,poolToken)
  let newPositionSupplyAmount = aaveV2Position.supplyAmount.minus(changeAmount)
  if(newPositionSupplyAmount.le(zeroBigInt)){
    store.remove('AaveV2Position',aaveV2Position.id)
  }else{
    aaveV2Position.supplyAmount = newPositionSupplyAmount
    aaveV2Position.save()
  }
  
}


export function handleAveV2Liquidated(event: LiquidatedEvent): void {
  let userId = event.params._liquidated.toHexString()
  checkWhale(userId)
  
  let repaidAmount = event.params._amountRepaid
  let liquidatedAmount = event.params._amountSeized

  let borrowTokenId = event.params._poolTokenBorrowed.toHexString()
  let aaveV2BorrowPosition = getPosition(userId,borrowTokenId)
  let newCompoundBorrowAmount = aaveV2BorrowPosition.borrowAmount.minus(repaidAmount)
  if(newCompoundBorrowAmount.le(zeroBigInt)){
    store.remove('AaveV2Position',aaveV2BorrowPosition.id)
  }else{
    aaveV2BorrowPosition.borrowAmount = newCompoundBorrowAmount
    aaveV2BorrowPosition.save()
  }
  

  let supplyTokenId = event.params._poolTokenCollateral.toHexString()
  let aaveV2SupplyPosition = getPosition(userId,supplyTokenId)
  let newCompoundSupplyAmount = aaveV2SupplyPosition.supplyAmount.minus(liquidatedAmount)
  if(newCompoundSupplyAmount.le(zeroBigInt)){
    store.remove('AaveV2Position',aaveV2SupplyPosition.id)
  }else{
    aaveV2SupplyPosition.supplyAmount = newCompoundSupplyAmount
    aaveV2SupplyPosition.save()
  }
  
}