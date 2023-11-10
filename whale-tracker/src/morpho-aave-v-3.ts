import { Address, BigInt,store } from "@graphprotocol/graph-ts"
import {
  Supplied as SuppliedEvent,
  CollateralSupplied as CollateralSuppliedEvent,
  Borrowed as BorrowedEvent,
  Repaid as RepaidEvent,
  Withdrawn as WithdrawnEvent,
  CollateralWithdrawn as CollateralWithdrawnEvent,
  Liquidated as LiquidatedEvent
} from "../generated/MorphoAaveV3/MorphoAaveV3"

import { Whale, AaveV3Position } from "../generated/schema"

const zeroBigInt = BigInt.fromString("0")

function convetTokenToName(poolToken:string): string{
  if(poolToken == "0x0b925ed163218f6662a35e0f0371ac234f9e9371"){
    return "wstETH"
  }else if(poolToken == "0x018008bfb33d285247a21d44e50697654f754e63"){
    return "DAI"
  }else if(poolToken == "0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c"){
    return "USDC"
  }else if(poolToken == "0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8"){
    return "WBTC"
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

function getPosition(userId:string,tokenId:string): AaveV3Position{
  let tokenName = convetTokenToName(tokenId)
  let positionId = userId.concat(tokenId)
  let aaveV3Position = AaveV3Position.load(positionId)
  if(aaveV3Position === null){
    let zeroBigInt = BigInt.fromString("0")
    aaveV3Position = new AaveV3Position(positionId)
    aaveV3Position.userId = userId
    aaveV3Position.tokenName = tokenName
    aaveV3Position.borrowAmount = zeroBigInt
    aaveV3Position.supplyAmount = zeroBigInt
    aaveV3Position.whale = userId
    aaveV3Position.save()
  }

  return aaveV3Position
}

function handleSupply(userId:string,tokenId:string,amount:BigInt): void{
  checkWhale(userId)

  let aaveV3Position = getPosition(userId,tokenId)
  let newPositionSupplyAmount = aaveV3Position.supplyAmount.plus(amount)
  aaveV3Position.supplyAmount = newPositionSupplyAmount

  aaveV3Position.save()
}

function handleWithdrawn(userId:string,tokenId:string,amount:BigInt): void{
  checkWhale(userId)

  let changeAmount = amount
  let aaveV3Position = getPosition(userId,tokenId)
  let newPositionSupplyAmount = aaveV3Position.supplyAmount.minus(changeAmount)
  let currentBorrowAmount = aaveV3Position.borrowAmount
  let borrowAmountLessThanZero = currentBorrowAmount.le(zeroBigInt)
  let supplyAmountLessThanZero = newPositionSupplyAmount.le(zeroBigInt)
  if(borrowAmountLessThanZero && supplyAmountLessThanZero){
    store.remove('AaveV2Position',aaveV3Position.id)
  }else{
    aaveV3Position.supplyAmount = newPositionSupplyAmount
    aaveV3Position.save()
  }
  
}

export function handleAaveV3Supplied(event: SuppliedEvent): void {
  let userId = event.params.onBehalf.toHexString()
  let tokenId = event.params.underlying.toHexString()
  handleSupply(userId,tokenId,event.params.amount)
}

export function handleAaveV3CollateralSupplied(event: CollateralSuppliedEvent): void {
  let userId = event.params.onBehalf.toHexString()
  let tokenId = event.params.underlying.toHexString()
  handleSupply(userId,tokenId,event.params.amount)
}

export function handleAaveV3Borrowed(event: BorrowedEvent): void {
  let userId = event.params.onBehalf.toHexString()
  checkWhale(userId)

  let changeAmount = event.params.amount
  let tokenId = event.params.underlying.toHexString()
  let aaveV3Position = getPosition(userId,tokenId)
  let newPositionBorrowAmount = aaveV3Position.borrowAmount.plus(changeAmount)
  aaveV3Position.borrowAmount = newPositionBorrowAmount

  aaveV3Position.save()

}

export function handleAaveV3Repaid(event: RepaidEvent): void {
  let userId = event.params.onBehalf.toHexString()
  checkWhale(userId)

  let changeAmount = event.params.amount
  let tokenId = event.params.underlying.toHexString()
  let aaveV3Position = getPosition(userId,tokenId)
  let newPositionBorrowAmount = aaveV3Position.borrowAmount.minus(changeAmount)
  let borrowAmountLessThanZero = newPositionBorrowAmount.le(zeroBigInt)
  let currentSupplyAmount = aaveV3Position.supplyAmount
  let supplyAmountLessThanZero = currentSupplyAmount.le(zeroBigInt)
  if(borrowAmountLessThanZero && supplyAmountLessThanZero){
    store.remove('AaveV2Position',aaveV3Position.id)
  }else{
    aaveV3Position.borrowAmount = newPositionBorrowAmount
    aaveV3Position.save()
  }
  
}

export function handleAaveV3Withdrawn(event: WithdrawnEvent): void {
  let userId = event.params.onBehalf.toHexString()
  let tokenId = event.params.underlying.toHexString()
  handleWithdrawn(userId,tokenId,event.params.amount)
}

export function handleAaveV3CollateralWithdrawn(event: CollateralWithdrawnEvent): void {
  let userId = event.params.onBehalf.toHexString()
  let tokenId = event.params.underlying.toHexString()
  handleWithdrawn(userId,tokenId,event.params.amount)
}

export function handleAaveV3Liquidated(event: LiquidatedEvent): void {
  let userId = event.params.borrower.toHexString()
  checkWhale(userId)
  
  let repaidAmount = event.params.amountLiquidated
  let liquidatedAmount = event.params.amountSeized


  let borrowTokenId = event.params.underlyingBorrowed.toHexString()
  let aaveV3BorrowPosition = getPosition(userId,borrowTokenId)
  let newAaveV3BorrowAmount = aaveV3BorrowPosition.borrowAmount.minus(repaidAmount)
  let borrowAmountLessThanZero = newAaveV3BorrowAmount.le(zeroBigInt)
  let currentSupplyAmount = aaveV3BorrowPosition.supplyAmount
  let supplyAmountLessThanZero = currentSupplyAmount.le(zeroBigInt)
  if(borrowAmountLessThanZero && supplyAmountLessThanZero){
    store.remove('AaveV2Position',aaveV3BorrowPosition.id)
  }else{
    aaveV3BorrowPosition.borrowAmount = newAaveV3BorrowAmount
    aaveV3BorrowPosition.save()
  }
  

  let supplyTokenId = event.params.underlyingCollateral.toHexString()
  let aaveV3SupplyPosition = getPosition(userId,supplyTokenId)
  let newAaveV3SupplyAmount = aaveV3SupplyPosition.supplyAmount.minus(liquidatedAmount)
  currentSupplyAmount = aaveV3SupplyPosition.borrowAmount
  borrowAmountLessThanZero = currentSupplyAmount.le(zeroBigInt)
  supplyAmountLessThanZero = newAaveV3SupplyAmount.le(zeroBigInt)
  if(newAaveV3SupplyAmount.le(zeroBigInt)){
    store.remove('AaveV2Position',aaveV3SupplyPosition.id)
  }else{
    aaveV3SupplyPosition.supplyAmount = newAaveV3SupplyAmount
    aaveV3SupplyPosition.save()
  }
  
}