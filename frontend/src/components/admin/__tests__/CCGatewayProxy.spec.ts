import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CCGatewayProxy from '../CCGatewayProxy.vue'
const {get,put,run}=vi.hoisted(()=>({get:vi.fn(),put:vi.fn(),run:vi.fn((action:()=>Promise<unknown>)=>action())}))
vi.mock('@/api/client',()=>({apiClient:{get,put}}))
vi.mock('vue-i18n',()=>({useI18n:()=>({t:(key:string)=>key})}))
vi.mock('@/composables/useStepUp',()=>({useStepUp:()=>({run}),isStepUpCancelled:()=>false}))
vi.mock('@/components/auth/TotpStepUpDialog.vue',()=>({default:{template:'<div />'}}))
const config={mode:'proxy',configured:true,url_redacted:'http://user:secret@proxy.example:8080',revision:3}
const render=async()=>{const w=mount(CCGatewayProxy);await flushPromises();return w}
describe('CCGateway proxy',()=>{
 beforeEach(()=>{vi.clearAllMocks();get.mockResolvedValue({data:{...config}});put.mockResolvedValue({data:{...config,revision:4}})})
 it('never fills saved credentials and sanitizes the displayed endpoint',async()=>{const w=await render();expect(w.get<HTMLInputElement>('input').element.value).toBe('');expect(w.text()).toContain('http://proxy.example:8080');expect(w.text()).not.toContain('secret');expect(w.get('input').attributes('type')).toBe('password')})
 it('uses step-up and clears secrets after saving a new URL',async()=>{const w=await render();await w.get('input').setValue('https://new:password@proxy.example:443');await w.get('form').trigger('submit');await flushPromises();expect(run).toHaveBeenCalledOnce();expect(put).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/proxy',{mode:'proxy',url:'https://new:password@proxy.example:443'},{timeout:55000});expect(w.get<HTMLInputElement>('input').element.value).toBe('')})
 it('clears draft proxy credentials when choosing direct mode',async()=>{const w=await render();await w.get('input').setValue('https://user:secret@example.test');await w.get('select').setValue('direct');await w.get('form').trigger('submit');await flushPromises();expect(put).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/proxy',{mode:'direct'},{timeout:55000})})
 it('requires first proxy URL and rejects SOCKS',async()=>{get.mockResolvedValue({data:{...config,mode:'inherit',configured:false}});const w=await render();await w.get('select').setValue('proxy');await w.get('form').trigger('submit');expect(put).not.toHaveBeenCalled();await w.get('input').setValue('socks5://localhost:1080');await w.get('form').trigger('submit');expect(put).not.toHaveBeenCalled();expect(w.get('[role="alert"]').text()).toContain('invalid')})
 it('does not reveal URLs from API error messages',async()=>{put.mockRejectedValue(new Error('https://user:secret@example.test'));const w=await render();await w.get('input').setValue('https://proxy.example');await w.get('form').trigger('submit');await flushPromises();expect(w.get('[role="alert"]').text()).toBe('admin.plugins.ccProxy.failed');expect(w.text()).not.toContain('secret')})
})
